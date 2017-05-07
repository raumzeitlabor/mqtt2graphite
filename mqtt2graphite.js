var mqtt = require('mqtt')
var config = require('app-config');
var timer = require('timer');
var graphite = require('graphite');
var wildcard = require('wildcard');

var client  = mqtt.connect('mqtt://'+config.mqtt.hostname)

/**
 * Stores the topic data to publish to graphite. A typical object would look
 * like this:
 *
 * { 'rzl.service.status.door': 1,
 *   'rzl.service.status.devices': 8,
 *   'rzl.service.status.presence': 2,
 *   'rzl.service.openhab.out.pca301_videogames.state': 0,
 *   'rzl.service.openhab.out.pca301_snackbar.state': 1,
 *   'rzl.service.openhab.out.pca301_twinkle.state': 1,
 *   'rzl.service.openhab.out.pca301_alarm.state': 0,
 *   'rzl.service.openhab.out.pca301_rundumleuchte.state': 0 }
 *
 * @var object
 */
var topicData = {};

/**
 * Timer to send data to graphite every second.
 */
timer.timer.auto(1000, function () {
    var client = graphite.createClient('plaintext://graphite.kunterbunt.vm.rzl:2003/');
    client.write(topicData, function(err) {
      // if err is null, your data was sent to graphite!
    });

    client.end();
});

/**
 * Checks if the given topic name matches a wildcard.
 */
function isTopic (topicName, topicToFind) {
  // Exact topic found
  if (topicName == topicToFind) {
    return true;
  }

  return wildcard(topicToFind, topicName);
}

/**
 * Converts an MQTT topic like /service/status to a graphite compatible
 * data metric name like rzl.service.status
 */
function convertTopic (topic) {
  var topicWithDots = topic.split('/').join('.');

  if (topicWithDots.indexOf(".") != 0) {
    topicWithDots = "."+ topicWithDots;
  }

  return "rzl"+topicWithDots;
}

/**
 * Converts a string to a number value based on a configuration.
 * @var value The value (or string) to convert
 * @var config A key-value config to lookup the numeric values for a given
 *            string. example:
 *            { "foo": 0, "bar": 1 }
 *            This config wold map "foo" to 0 and "bar" to 1.
 */
function convertStringToNumber (value, config) {
  for (i in config.map) {
    if (i == value) {
      return config.map[i];
    }
  }

  return "";
}

/**
 * Subscribe to all topics, so that we can catch wildcard topics from the
 * configuration.
 */
client.on('connect', function () {
  client.subscribe('#')
})

client.on('message', function (topic, message) {
  var currentConfig;
  var submitValue;
  var topicName;


  for (i=0;i<config.topics.length;i++) {
    currentConfig = config.topics[i];

    if (!isTopic(topic, currentConfig.topic)) {
      continue;
    }

    if (currentConfig.outputTopic) {
    topicName = convertTopic(currentConfig.outputTopic);
    } else {
    topicName = convertTopic(topic);
    }

    switch (currentConfig.transform) {
      case "countJson":
        try {
          json = JSON.parse(message);

          if (json instanceof Array) {
              topicData[topicName] = json.length;
          }
        } catch (e) {
          console.log("unable to parse message "+message);
        }
      break;

      case "stringToNumber":
        topicData[topicName] = convertStringToNumber(message, currentConfig.config);
        break;
      default:
        topicData[topicName] = parseInt(message);
        break;
    }
  }

});
