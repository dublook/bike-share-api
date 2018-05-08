var body = {
  "MemberID": process.argv[2],
  "Password": process.argv[3],
  "AreaId": process.argv[4]
};
var event = {
  "body": JSON.stringify(body),
  "pathParameters": {
    "ParkingID": "10013"
  }
};

var context = {
    succeed: function(data){console.log(JSON.stringify(data,' ',4));},
    fail: function(data){console.log("fail!!\n" + JSON.stringify(data,' ',4));},
    invokedFunctionArn: 'test:development',
    functionName: 'test',
    functionVersion: '$LATEST'
};
var callback = function(param1, response){
  var body = JSON.parse(response.body);
  console.log(body);
};

var myLambda = require('./handler');
myLambda.bikes(event, context, callback);
//myLambda.ports(event, context, callback);
