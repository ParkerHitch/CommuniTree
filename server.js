const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const port = 3000;

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.use(session({
    secret: 'keyboard cat',
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
    resave: false
}))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.engine('html', require('ejs').renderFile)

app.use("/", express.static("./client"));


//DATABASE STRUCTURE
app.get("/api/:pathToFile", function (req, res) {
    console.log("RECEIVED " + req.params.pathToFile);
    res.sendFile(__dirname + "/database/" + req.params.pathToFile);
});

app.get("/api/images/:imgName", function (req, res) {
    console.log("IMAGE " + req.params.imgName);
    res.sendFile(__dirname + "/database/images/" + req.params.imgName);
});

//IMAGE UPLOADING
app.post("/api/post/photo/user/:username", function(req, res) {
    console.log("IMAGE RECEIVED FROM + "+req.params.username);
    const date = new Date();
    const year = date.getFullYear();
    // 👇️ getMonth returns integer from 0(January) to 11(December)
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const withHyphens = [year, month, day].join('-');

    const newPath = './database/images/'+req.params.username+withHyphens+'.jpg';
    const imgdata = req.body.img;
    // to convert base64 format into random filename
    const base64Data = imgdata.replace(/^data:([A-Za-z-+/]+);base64,/, '');
    fs.writeFileSync(newPath, base64Data,  {encoding: 'base64'});

    //SWITCH JSON
    let rawdata = fs.readFileSync('./database/users.json');
    let users = JSON.parse(rawdata);
    for(let i in users){
        let user = users[i];
        if(user.name == req.params.username){
            fs.unlink("./database/images/"+user.lastImage, function (err) {
                users[i].lastImage = req.params.username+withHyphens+'.jpg';
                users[i].location[0] = parseFloat(req.body["location[]"][0])
                users[i].location[1] = parseFloat(req.body["location[]"][1]);
            });
        }
    }
    let data = JSON.stringify(users);
    fs.writeFileSync('./database/users.json', data);
    console.log("SAVED TO "+newPath);
});

// HOME SCREEN
app.get('/', function(req, res) {
    if (req.session.loggedIn) {
        res.render(__dirname + "/views/index.html", {username: req.session.username});
    } else {
        res.redirect("/login");
    }
    res.end();
});


// AUTHENTICATION
app.get("/login", function(req, res) {
    res.sendFile(__dirname + "/views/login.html")
})

app.post("/login", function(req, res) {
    let username = req.body.username;
    if (username) {
        req.session.loggedIn = true;
        req.session.username = username;
        res.redirect('/');
    } else {
        res.send('Please enter username!');
    }
    res.end();
});

app.get('/logout', function(req, res) {
    req.session.destroy();
    res.redirect("/login")
})

app.listen(port, function () {
    console.log(`Listening on port ${port}!`);
});