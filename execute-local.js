var arg_i = 2;
const methodName = process.argv[arg_i++];
var body = {
  "MemberID": process.argv[arg_i++],
  "Password": process.argv[arg_i++],
  "AreaId": process.argv[arg_i++]
};
var event = {
  "body": JSON.stringify(body),
  "pathParameters": {
    //"ParkingID": "10013" // kanda jidoh park
    //"ParkingID": "10069" // toranomon
    "ParkingID": "10302" // akihabara yodobashi
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
const func = myLambda[methodName];
if (!func) {
  console.log(`ERROR: No function was found with name '${methodName}'`);
} else {
  func.call(myLambda, event, context, callback);
}
