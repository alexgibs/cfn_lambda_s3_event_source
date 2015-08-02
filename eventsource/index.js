var aws = require("aws-sdk");

exports.handler = function (event, context) {

  console.log("REQUEST RECEIVED:\n" + JSON.stringify(event));

  // For Delete requests, immediately send a SUCCESS response.
  if (event.RequestType == "Delete") {
    sendResponse(event, context, "SUCCESS");
    return;
  }

  var responseStatus = "FAILED",
    responseData = {},
    s3 = new aws.S3({
      region: event.ResourceProperties.Region
    }),
    lambda = new aws.Lambda({
      region: event.ResourceProperties.Region
    }),
    lambdaParams = {
      Action: 'lambda:InvokeFunction',
      FunctionName: event.ResourceProperties.myLambdaFunctionName,
      Principal: 's3.amazonaws.com',
      StatementId: event.ResourceProperties.myLambdaFunctionName
    },
    s3Params = {
      Bucket: event.ResourceProperties.myS3Bucket,
      NotificationConfiguration: {
        LambdaFunctionConfigurations: [{
          Events: [
            's3:ObjectCreated:Put'
          ],
          LambdaFunctionArn: event.ResourceProperties.myLambdaFunctionArn
        }]
      }
    }

  lambda.addPermission(lambdaParams, function (err, data) {
    if (err) console.fail(err);
    else {
      s3.putBucketNotificationConfiguration(s3Params, function (err, data) {
        if (err) {
          responseData = {
            Error: "S3 put notification call failed"
          };
          console.log(responseData.Error + ":\n", err);
        } else {
          console.log(data);
          responseStatus = "SUCCESS";
        }
        sendResponse(event, context, responseStatus, responseData);
      });
    }
  });
};

// Send response to the pre-signed S3 URL 
function sendResponse(event, context, responseStatus, responseData) {

  var responseBody = JSON.stringify({
    Status: responseStatus,
    Reason: "See the details in CloudWatch Log Stream: " + context.logStreamName,
    PhysicalResourceId: context.logStreamName,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: responseData
  });

  console.log("RESPONSE BODY:\n", responseBody);

  var https = require("https");
  var url = require("url");

  var parsedUrl = url.parse(event.ResponseURL);
  var options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.path,
    method: "PUT",
    headers: {
      "content-type": "",
      "content-length": responseBody.length
    }
  };

  console.log("SENDING RESPONSE...\n");

  var request = https.request(options, function (response) {
    console.log("STATUS: " + response.statusCode);
    console.log("HEADERS: " + JSON.stringify(response.headers));
    context.done();
  });

  request.on("error", function (error) {
    console.log("sendResponse Error:" + error);
    context.done();
  });

  request.write(responseBody);
  request.end();
}