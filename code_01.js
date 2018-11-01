/* email service */
// this code assumes that you have a code_01 MySQL database running, and can be accessed using root/<no password>

const express = require('express');
const app = express();
const bodyParser = require('body-parser');      //for letting Express handle POST data
const cors=require('cors');
const nodemailer = require('nodemailer');
var router = express.Router();
var Sequelize = require('sequelize');

var port = 8090;

//the following will be put in a config file
var dbConfig = {
	user: 	  "root",
	password: "",
	database: "code_01",
	host: "localhost"
};
var emailService = nodemailer.createTransport({
    service: 'gmail',
    auth: {
           user: 'zonamailbox2@gmail.com',
           pass: 'Aa123456!'
       }
   });

//

var sqlConn = new Sequelize(
    dbConfig.database,
    dbConfig.user,
    dbConfig.password,
    {
        host: dbConfig.host,
        dialect: 'mysql',
        logging: false,
        define: {
            freezeTableName: true          //so table names won't be assumed pluralized by the ORM
        },
        pool: {
            max: 50,
            min: 0,
            idle: 10000
        }
    });

var Users = sqlConn.import(__dirname + "/models/user");
sqlConn.sync();


app.use(bodyParser.json());                 		//this lets Express handle POST data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use(cors());            //cross browser origin support

app.use(router);

app.get('/',function(req,res){
    res.redirect('/app/index.html');
})

app.get('/api/ping',function(req,res){
    res.status(200).json({message:'API test'});
    res.end();
    return;
});


app.get('/api/email/verify',function(req,res){
    //mark user as verified in the database    
    var userEmail = req.query.email;
    if(!userEmail){
        res.status(500).json({message: 'User validation failed. Please check logs for error'});
        console.error("Email field was undefined in the request");
        return;
    }

    Users.update(
        { isVerified: 1 },
        { where: {email: userEmail}}
    )
    .then(function(){
        //this is typically where we would redirect user to success or home page with token(s)
        res.status(200).json({message:'User verified'});
        res.end();
        return;
    })
    .catch(function(err){
        res.status(500).json({message: 'User validation failed. Please check logs for error'});
        console.error("Email verification failed. Details: ",err);
        res.end();
        return;
    })

});

app.post('/api/user/register',function(req,res){
    if(!req.body.name || !req.body.email){
        res.status(500).json({success:false, message: 'Required field(s) missing'});
        return;
    }

    Users.findAndCountAll({
        where: {
            email: req.body.email
        }
    })
    .then(function(userRows){
        if(userRows.count === 0){
            var user = Users.build({
                name: req.body.name,
                email: req.body.email,
                isVerified: 0
            });

            return user.save();
        }
        else{
            throw new Error('That email has already been registered');
            return;
        }
    })
    .then(function () {
        var mailOptions = {
            from: 'zonamailbox2@gmail.com',
            to: req.body.email,
            subject: 'Verification email',
            html: 'Please click <a href="http://localhost:8090/api/email/verify?email=' + req.body.email + '">here</a> to verify your account'
        };
    
        emailService.sendMail(mailOptions,(error,info) => {
            if(error){
                throw new Error("Error trying to send email: ",error);
            }
            console.info("Verification email was sent. Details:",info);
            res.status(200).json({success:true, message:'User account has been added and verification email sent to user'});
            res.end();
            return;
        });
    })
    .catch(function (err) {
        res.status(500).json({success:false, message:err.message});
        return;
    });
})

app.post('/api/email/send',function(req,res){
    
    if(!req.body.name || !req.body.email){
        res.status(500).json({message: 'Required field(s) missing'});
        return;
    }
    
    var mailOptions = {
        from: 'zonamailbox2@gmail.com',
        to: req.body.email,
        subject: 'Verification email',
        html: 'Please click <a href="http://localhost:8090/api/email/verify?email=' + req.body.email + '">here</a> to verify your account'
    };

    emailService.sendMail(mailOptions,(error,info) => {
        if(error){
            console.error("Error trying to send email: ",error);
            res.status(500).json({message: 'Email sending failed', details: 'info'});
            return;
        }
        console.info("Verification email was sent. Details:",info);
        res.status(200).json({message:'A verification email was sent to '+ req.body.email});
        res.end();
        return;
    })

});


app.listen(port);
console.info('Code 01 initialized...');


