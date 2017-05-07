module.exports = [
	{	topic: "service/status/presence",	transform: "countJson" },
	{	topic: "/service/status/devices" },
  {	topic: "/service/status", transform: "stringToNumber", outputTopic: "/service/status/door",
	  config: {
		  map: {
		   '"open"': 1,
		   '"closed"': 0
	    }
    }
  },
	{ topic: "/service/openhab/out/*/state", transform: "stringToNumber",
		config: {
			map: {
		 	'ON': 1,
		 	'OFF': 0
			}
		}
	}
]
