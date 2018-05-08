var body = {
  "MemberID": process.argv[2],
  "Password": process.argv[3],
  "AreaId": process.argv[4]
};
var event = {
  "body": JSON.stringify(body)
};

var context = {
    succeed: function(data){console.log(JSON.stringify(data,' ',4));},
    fail: function(data){console.log("fail!!\n" + JSON.stringify(data,' ',4));},
    invokedFunctionArn: 'test:development',
    functionName: 'test',
    functionVersion: '$LATEST'
};
var callback = function(param1, response){
  console.log(response);
};

var myLambda = require('./handler');
myLambda.ports(event, context, callback);
