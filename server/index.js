var http = require('http');
var path = require('path');

var express = require('express');
const axios = require('axios');
const massive = require('massive');

// initialize the express application
var express = require("express");
var session = require("express-session");
var process = require("process");
var router = express();

var CLIENT_ID = '22CFSG';
var CLIENT_SECRET = 'ffb7405c22f3c71b44ddf53c408f093d';
var SESSION_SECRET = 'ytrhcyftrtrsedthrdyu';
var CALLBACK_URL = 'http://localhost:8080/callback';


// initialize the Fitbit API client
var FitbitApiClient = require("fitbit-node");
var client = new FitbitApiClient(CLIENT_ID, CLIENT_SECRET);

// Use the session middleware

massive('postgres://ahqvwbzkaxiylb:2483305b5edb7da64f1e4dbc63dc98c91cc70c6998d3fbb9fbb78e98206a608e@ec2-54-163-249-237.compute-1.amazonaws.com:5432/d8dl2c3o4vsdt?ssl=true').then( (db) => {
    console.log('Connected to Heroku')
    router.set('db', db);
})


router.use(session({
     secret: SESSION_SECRET, 
     cookie: { maxAge: 60000 },
     resave: false,
     saveUninitialized: true
    }));

// redirect the user to the Fitbit authorization page
router.get("/authorize", function (req, res) {
    // request access to the user's activity, heartrate, location, nutrion, profile, settings, sleep, social, and weight scopes
    res.redirect(client.getAuthorizeUrl('activity heartrate location nutrition profile settings sleep social weight',CALLBACK_URL));
});

// handle the callback from the Fitbit authorization flow
router.get("/callback", function (req, res) {
    // exchange the authorization code we just received for an access token
    client.getAccessToken(req.query.code, CALLBACK_URL).then(function (result) {
        axios.get('https://api.fitbit.com/1/user/-/profile.json', {headers: {Authorization: `Bearer ${result.access_token}`}})
            .then( profileData => {
                console.log('/********************/', profileData)
                const db = router.get('db');

                db.find_user([result.access_token])
                    .then(user => {
                        if(!user[0]){
                            db.create_user([
                                profileData.data.user.firstName,
                                profileData.data.user.lastName,
                                profileData.data.user.avatar640,
                                profileData.data.user.encodedId,
                                profileData.data.user.height,                                
                                profileData.data.user.weight,                                
                                profileData.data.user.dateOfBirth,                                
                                profileData.data.user.gender,                                
                                profileData.data.user.timezone,
                                result.access_token                                
                            ])
                        }
                    })
            })
            .catch(error => console.log('error: ', error))

        // use the access token to fetch the user's profile information
        req.session.authorized = true;
        req.session.access_token = result.access_token;
        req.session.save();
        res.redirect("http://localhost:3000/success");
    }).catch(function (error) {
        res.send(error);
    });
});

router.get("/logout", function(req, res) {
    
    req.session.authorized = false;
    req.session.access_token = null;
    req.session.save();
    res.redirect("/");  
})

router.get('/profile.json', function(req, res) {
    if (req.session.authorized) {
        client.get("/profile.json", req.session.access_token).then(function (results) {
            res.json(results[0]);
            return res.status(200).send(results)
        });
    } else {
        res.status(403);
        res.json({ errors: [{ message: 'not authorized' }]});
    }
});


// launch the server
const PORT = 8080;
router.listen(PORT, () => console.log(`Listening on port: ${PORT}`));