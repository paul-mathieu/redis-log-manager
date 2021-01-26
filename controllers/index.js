const jwt = require('jsonwebtoken');
const redis = require("redis");
const client = redis.createClient();
client.on("error", function(error) {
	console.error(error);
});

function createToken(user) {
    return jwt.sign({id: user.id, username: user.username}, "My so secret sentence");
}

function signin(req, res) {
    let User = require('../models/user');
	User.findOne({username: req.body.account}, function(err, user) {
		if (err) throw err;
		if (user.comparePassword(req.body.password)) {
            req.session.username = req.body.account;
			req.session.logged = true;
			let t = createToken(user);
			console.log(t);
			res.status(200).json({token: t});
		} else res.redirect('/');
	});
}

// signup
function signup(req, res) {
    let User = require('../models/user');
	let user = new User();
	user.username = req.body.account;
	user.password = req.body.password;
	user.save((err, savedUser) => {
		if (err) throw err;
		res.redirect('/');
	});
}

// signout
function signout(req, res) {
    req.session.username = "";
	req.session.logged = false;
    res.redirect("/");
}

// profile
function profile(req, res) {
	console.log(req.session.logged)
    if (req.session.logged) res.send("Bonjour");
    else res.redirect('/');
}


// verification for redis
function verificationTokenRedis(t){
	return client.get(t);
}

// creation for redis
function createRedis(t){
	client.set(t,'1')
	// Ajout du ttl
	client.expire(t, 600);
}

// use data
function data(req, res) {
	if(req.session.logged){
		const tokenbis = req.header('Authorization')
		const token = req.header('Authorization').replace('Bearer ', '')
		// Si le token est ok
		try{
			const payload = jwt.verify(token,  "My so secret sentence")
			console.log("data : ok")
			console.log('token :', verificationTokenRedis(tokenbis))
			if (verificationTokenRedis(tokenbis) != false) { // begin redis
				console.log("Cas 1 : ");
				// incr and verify the value
				client.get(tokenbis, function(err, value) {
					if (err) throw err;
					if(value < 10) {
						client.incr(tokenbis);
						console.log("value : <10 ~ ", value);
						res.send('Data');
					} else console.log("Too many request for this TOKEN, wait please - ", value);
				  });
			} else createRedis(tokenbis); // If token already exist				
		} catch(error) {console.error(error.message)} // If error with the token
	} else res.send('You\'re not connected');
}

module.exports.signin = signin;
module.exports.signup = signup;
module.exports.signout = signout;
module.exports.profile = profile;
module.exports.data = data;