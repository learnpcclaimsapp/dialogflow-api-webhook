var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var ObjectID = mongodb.ObjectID;

var CLAIMS_COLLECTION = "claims";

var app = express();
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());

// Create a database variable outside of the database connection callback to reuse the connection pool in your app.
var db;

// Connect to the database before starting the application server.
mongodb.MongoClient.connect(process.env.MONGODB_URI, function (err, database) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  // Save database object from the callback for reuse.
  db = database;
  console.log("Database connection ready");

  // Initialize the app.
  var server = app.listen(process.env.PORT || 8080, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
  });
});

// Claims API ROUTES BELOW

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}

/*  "/claims"
 *    GET: finds all claims
 *    POST: creates a new claim
 */

app.get("/claims", function(req, res) {
  db.collection(CLAIMS_COLLECTION).find({}).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get claims.");
    } else {
      res.status(200).json(docs);
    }
  });
});

app.post("/claims", function(req, res) {
  var newClaim = req.body;
  newClaim.createDate = new Date();

  if (!(req.body.memberNr || req.body.lossNr)) {
    handleError(res, "Invalid user input", "Must provide a memberNr and lossNr.", 400);
  }

  db.collection(CLAIMS_COLLECTION).insertOne(newClaim, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to create new claim.");
    } else {
      res.status(201).json(doc.ops[0]);
    }
  });
});

/*  "/claims/:id"
 *    GET: find claim by id
 *    PUT: update claim by id
 *    DELETE: deletes claim by id
 */

app.get("/claims/:id", function(req, res) {
  db.collection(CLAIMS_COLLECTION).findOne({ _id: new ObjectID(req.params.id) }, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to get claim");
    } else {
      res.status(200).json(doc);
    }
  });
});

app.put("/claims/:id", function(req, res) {
  var updateDoc = req.body;
  delete updateDoc._id;

  db.collection(CLAIMS_COLLECTION).updateOne({_id: new ObjectID(req.params.id)}, updateDoc, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to update claim");
    } else {
      res.status(204).end();
    }
  });
});

app.delete("/claims/:id", function(req, res) {
  db.collection(CLAIMS_COLLECTION).deleteOne({_id: new ObjectID(req.params.id)}, function(err, result) {
    if (err) {
      handleError(res, err.message, "Failed to delete claim");
    } else {
      res.status(204).end();
    }
  });
});

app.get("/webhook1/claim", function(req, res) {
  console.log(req);
  var query = { memberNr: req.body.queryResult.parameters['memberNr'], lossNr: req.body.queryResult.parameters['lossNr'] };
  db.collection(CLAIMS_COLLECTION).findOne(query, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to get claim");
    } else {
      console.log(doc);
      var webhookReply = 'Hellooooooo ' + req.query.memberNr+ '! Welcome from the webhook.'
      res.status(200).json({
  fulfillmentText: webhookReply
  });
    }
  });
});


app.post('/webhook', function (req, res) {
  // we expect to receive JSON data from api.ai here.
  // the payload is stored on req.body
  console.log(req.body)

  // we have a simple authentication
  // if (REQUIRE_AUTH) {
  //   if (req.headers['auth-token'] !== AUTH_TOKEN) {
  //     return res.status(401).send('Unauthorized')
  //   }
  // }

  // and some validation too
  if (!req.body || !req.body.queryResult || !req.body.queryResult.parameters) {
    return res.status(400).send('Bad Request')
  }

  // the value of Action from api.ai is stored in req.body.result.action
  console.log('* Received action -- %s', req.body.queryResult.action)

  //TODO
  // Check what is the action in the webhook using req.body.queryResult.action
  // Based on action read the paramters from entities
  // Eg: var memberNr = req.body.queryResult.parameters['memberNr'] - where memberNr is the name from dialogflow variable
  // Build the query with parameters shown below sample
  // Once you get the result from db query build the response as fullfill ment text as shown below
  // res.status(200).json({
  // fulfillmentText: webhookReply
  // })

  // parameters are stored in req.body.result.parameters
  
  // var infoNeeded = req.body.queryResult.parameters['infoNeeded'];
  // var lossType = req.body.queryResult.parameters['lossType'];
  // var lossDate = req.body.queryResult.parameters['lossDate'];
  // var lossDesc = req.body.queryResult.parameters['lossDesc'];
  var action = req.body.queryResult.action;

  // console.log(memberNr);
  // console.log(lossNr);

  // var query = { memberNr: memberNr};

  
  if(action == "claim-status")
  {
    var memberNr = req.body.queryResult.parameters['memberNr'];
    var lossNr = req.body.queryResult.parameters['lossNr'];
    var query = { memberNr: memberNr,lossNr: lossNr };
    
    var webhookReply = '';
    var inspAvailable = '';
    var rentalAvailable = '';
    var msrAvailable = '';
    var totalLossAvailable = '';

    db.collection(CLAIMS_COLLECTION).find(query).toArray(function(err, result) {
      if (err) throw err;
      console.log(result[0].payments);

      if(result[0].inspStatus != null )
      {
        inspAvailable = 'Y';
      }
      if(result[0].rentalAsgnStatus != null )
      {
        rentalAvailable = 'Y';
      }
      if(result[0].msrDetails != null )
      {
        msrAvailable = 'Y';
      }
      if(result[0].totalLoss != null )
      {
        totalLossAvailable = 'Y';
      }

      webhookReply = 'Hello ' + memberNr + '! Welcome to Claims. I can provide you information about ';
    
      if(inspAvailable == 'Y' ){
        webhookReply = webhookReply +  ', '+ 'Inspection';
      }

      if(rentalAvailable == 'Y'){
        webhookReply = webhookReply +  ', '+'Rental Assignment';
      }

      if(msrAvailable == 'Y'){
        webhookReply = webhookReply + ', '+ 'MSR Details';
      }

      if(totalLossAvailable == 'Y'){
        webhookReply = webhookReply + ', '+ 'Total Loss Offer';
      }

      if(inspAvailable != 'Y' && rentalAvailable != 'Y' && msrAvailable != 'Y' && totalLossAvailable != 'Y' ){
      webhookReply = 'Hello ' + memberNr + '! Welcome to Claims. We are working on your claim. Any update will be notified';
      }
      
    
      res.status(200).json({
        fulfillmentText: webhookReply
        })
      });
    
}

if(action == "claim-status-inspection"){
    var memberNr = req.body.queryResult.outputContexts[0].parameters['memberNr'];
    var lossNr = req.body.queryResult.outputContexts[0].parameters['lossNr'];
    var query = { memberNr: memberNr,lossNr: lossNr };
    var webhookReply = '';

    webhookReply = memberNr;
    db.collection(CLAIMS_COLLECTION).find(query).toArray(function(err, result) {
      if (err) throw err;
      console.log(result[0].payments);
      
      if(result[0].inspStatus == "Scheduled"){
      webhookReply = 'Dear ' + memberNr + '! Your '+result[0].inspType+' inspection has been scheduled on '+result[0].inspDate;
      }
      else{
        webhookReply = 'Dear ' + memberNr + '! Your inspection has not been scheduled yet. We will let you as soon as an inspection is scheduled.';
      }

    res.status(200).json({
      fulfillmentText: webhookReply
      })
    });
}

if(action == "claim-status-rental"){
  var memberNr = req.body.queryResult.outputContexts[0].parameters['memberNr'];
  var lossNr = req.body.queryResult.outputContexts[0].parameters['lossNr'];
  var query = { memberNr: memberNr,lossNr: lossNr };
  var webhookReply = '';

  webhookReply = memberNr;
  db.collection(CLAIMS_COLLECTION).find(query).toArray(function(err, result) {
    if (err) throw err;
    console.log(result[0].payments);
    
    if(result[0].rentalAsgnStatus == "Confirmed"){
    webhookReply = 'Dear ' + memberNr + '! Your policy allows you to rent a '+result[0].rentalCovClass+' vehicle. Your Rental Vehicle has been confirmed. The confirmation number is '+ result[0].rentalConfNumber+ ' . Your rental reservation ends on '+result[0].rentalEndDate+'.';
    }
    else{
      webhookReply = 'Dear ' + memberNr + '! Your policy does not allow you to rent a vehicle.'
    }

  res.status(200).json({
    fulfillmentText: webhookReply
    })
  });
}

if(action == "claim-status-msr"){
  var memberNr = req.body.queryResult.outputContexts[0].parameters['memberNr'];
  var lossNr = req.body.queryResult.outputContexts[0].parameters['lossNr'];
  var query = { memberNr: memberNr,lossNr: lossNr };
  var webhookReply = '';

  webhookReply = memberNr;
  db.collection(CLAIMS_COLLECTION).find(query).toArray(function(err, result) {
    if (err) throw err;
    console.log(result[0].payments);
    
    if(result[0].msrDetails != ""){
    webhookReply = 'Dear ' + memberNr + '! Your claim has been handled by '+result[0].msrDetails;
    }
    else{
      webhookReply = 'Dear ' + memberNr + '! Please call 210-456-9999 to know more about your claim.';
    }

  res.status(200).json({
    fulfillmentText: webhookReply
    })
  });
}

if(action == "claim-status-totalloss"){
  var memberNr = req.body.queryResult.outputContexts[0].parameters['memberNr'];
  var lossNr = req.body.queryResult.outputContexts[0].parameters['lossNr'];
  var query = { memberNr: memberNr,lossNr: lossNr };
  var webhookReply = '';

  webhookReply = memberNr;
  db.collection(CLAIMS_COLLECTION).find(query).toArray(function(err, result) {
    if (err) throw err;
    console.log(result[0].payments);
    
    if(result[0].inspStatus == "Scheduled"){
    webhookReply = 'Dear ' + memberNr + '! Your '+result[0].inspType+' inspection has been scheduled on '+result[0].inspDate;
    }
    else{
      webhookReply = 'Dear ' + memberNr + '! Your inspection has not been scheduled yet. We will let you as soon as an inspection is scheduled.';
    }

  res.status(200).json({
    fulfillmentText: webhookReply
    })
  });
}
else if(action == "report-claim"){
  var myobj = { memberNr: memberNr, lossNr: lossNr, lossType: lossType, lossDate: lossDate, lossDesc: lossDesc };
  var query = { memberNr: memberNr};
  var webhookReply = '';

  // db.collection(CLAIMS_COLLECTION).find(query).toArray(function(err, result) {
  //   if (err) throw err;
  //   console.log(result[0].payments);
  // });

  db.collection(CLAIMS_COLLECTION).insertOne(myobj,function(err, result) {
      if (err) throw err;
      console.log('1 record has been inserted');
    });

  webhookReply = 'Hello ' + memberNr + '! Welcome from the webhook. Your loss details has been recorded';

  res.status(200).json({
    fulfillmentText: webhookReply
    })

    
}

})