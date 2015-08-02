# cfn_lambda_s3_event_source

Example Cloudformation template to add an s3 bucket as an event source to a Lambda function. It creates a helper Lambda function "AddEventSource", which is used as a custom resource. 

Lambda function "myLambdaFunction" will be invoked by notifications on bucket "myS3Bucket" for 's3:ObjectCreated:Put' events
