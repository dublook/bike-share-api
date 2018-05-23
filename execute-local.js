var arg_i = 2;
const methodName = process.argv[arg_i++];
var body = {
  "MemberID": process.argv[arg_i++],
  "Password": process.argv[arg_i++],
  "slackWebhookUrl": "https://hooks.slack.com/services/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"
};
var event = {
  "pathParameters": {
    "AreaID": process.argv[arg_i++],
    "ParkingID": "10197",
    //"ParkingID": "10009", // A2-02.西神田公園（北側）: ID:10009
    //"ParkingID": "10485", // 興和一橋ビル
    //"ParkingID": "10013", // kanda jidoh park
    //"ParkingID": "10069". // toranomon 10485
    // A3-03.ＮＴＴ東日本神田ビル: , ID:10015
    // A2-09.テラススクエア: ID:10038
    // A2-01.神田駿河台下: ID:10008
    "ParkingIds": "10013,10015,10485,10038,10008"
  },
  "body": JSON.stringify(body)
};

var context = {
    succeed: function(data){console.log(JSON.stringify(data,' ',4));},
    fail: function(data){console.log("fail!!\n" + JSON.stringify(data,' ',4));},
    invokedFunctionArn: 'test:development',
    functionName: 'test',
    functionVersion: '$LATEST'
};
var callback = function(error, response){
  var res = error ? error : JSON.parse(response.body);
  console.log(res);
};

var myLambda = require('./handler');
const func = myLambda[methodName];
if (!func) {
  console.log(`ERROR: No function was found with name '${methodName}'`);
} else {
  func.call(myLambda, event, context, callback);
}
