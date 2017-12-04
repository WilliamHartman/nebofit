require('dotenv').config();
const express = require('express')
    , bodyParser = require('body-parser')
    , session = require('express-session')
    , passport = require('passport')
    , Auth0Strategy = require('passport-auth0')
    , massive = require('massive')
    ;


const app = express();
app.use(bodyParser.json());
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true
}))
app.use(passport.initialize());
app.use(passport.session());

massive(process.env.CONNECTION_STRING).then( (db) => {
    console.log('Connected to Heroku')
    app.set('db', db);
})

passport.use( new Auth0Strategy({
    domain: process.env.AUTH_DOMAIN, 
    clientID: process.env.AUTH_CLIENTID,
    clientSecret: process.env.AUTH_CLIENT_SECRET,
    callbackURL: process.env.AUTH_CALLBACK
}, (accessToken, refreshToken, extraParams, profile, done) => {
    
    const db = app.get('db');
    const userData = profile._json;
    
    db.find_user([userData.identities[0].user_id])
        .then(user => {
            if(user[0]){
                return done(null, user[0].id);
            } else {
                db.create_user([
                    userData.firstName,
                    userData.lastName,
                    userData.email,
                    userData.picture,
                    userData.identities[0].user_id
                ]).then ( user => {
                    return done(null, user[0].id);
                })
            }
        })
}))
passport.serializeUser( (id, done) => {
    done(null, id);
})
passport.deserializeUser( (id, done) => {
    app.get('db').find_session_user([id])
        .then( user => {
            done(null, user[0])
        })
})

app.get('/auth', passport.authenticate('auth0'));
app.get('/auth/callback', passport.authenticate('auth0', {
    successRedirect: 'http://localhost:3000/',
    failureRedirect: '/auth'
}));
app.get('/auth/me', (req, res) => {
    if(req.user){
        return res.status(200).send(req.user);
    } else {
        return res.status(401).send('Please login');
    }
})
app.get('/logout', (req, res) => {
    req.logout();
    res.redirect(308, 'http://localhost:3000/')
})


const PORT = 8080;
app.listen(PORT, () => console.log(`Listening on port: ${PORT}`));