'use strict';

// -------------------- requires -------------------
var express = require('express');

/*
Wikipedia: Cross-origin resource sharing (CORS)
- is a mechanism that allows restricted resources
on a web page to be requested from another domain outside the domain from which the first resource was served
- a web page may freely embed cross-origin images, stylesheets, scripts, iframes, and videos.
Certain "cross-domain" requests, notably Ajax requests, are forbidden by default by the same-origin security policy.
- Access-Control-Allow-Origin: http://www.example.com
  = cross-origin-request is allowed by example.com
*/
var cors = require('cors');

/*
https://www.npmjs.com/package/multer
- middleware for handling multipart/form-data, which is primarily used for uploading files
- Multer adds a body object and a file or files object to the request object
- body object contains the values of the text fields of the form
- file or files object contains the files uploaded via the form
- don't forget the enctype="multipart/form-data" in your form

-> built on: https://github.com/mscdex/busboy
*/
var multer = require('multer');

// handling files
const path = require('path');
const fs = require('fs');


// ---------------- filesystem-stuff -------------------
// create 'uploads' manually on console!
// uploads/.gitignore -> * (no filetransfer to github)
const uploadDir = 'uploads';
const directoryPath = path.join(__dirname, uploadDir);

// get all files of upload-dir
// ignore files starting with '.'
const readDir = (fs, directoryPath) => {
  return new Promise((resolve, reject)=>{  
    fs.readdir(directoryPath, function (err, files) {
      if(err) {
        console.log('Unable to scan directory: ' + err);
        reject(err);
      } 
      let cFiles = files.filter((v,i)=>{
        if(v.indexOf('.')===0) return false;
        return true;
      });
      resolve(cFiles);
    });  
  });
}

// delete files in: directoryPath
const deleteFiles = (fs, fileArr) => {
  fileArr.forEach(v=>{
    if(v.indexOf('/')>-1 || v.indexOf('.')===0) throw("not allowed character in: "+v);
    let path = directoryPath + '/' + v; 
    try {
      console.log("unlink: ", path)
      fs.unlinkSync(path)
    } catch(err) {
      console.error(err)
    }    
  });
}

// foo.txt -> txt
const getSuffix = (f) => {
   let pos = f.lastIndexOf('.');
   if(pos==-1) return false;
   return f.substr(pos+1).toLowerCase();  
}


// ---------------- config multer ----------------------
// [1] simple version
// this automatically creates an /uploads-folder
// files are stored this way:
// upfile/edff039188e557ba9eab2afa37d41602
//var upload = multer({ dest: uploadDir });


// [2] custom upload
// folder will NOT be created automatically
// remove unwanted folder in Glitch-console: rm -R foofolder

// (a) storage
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    let f = file.originalname.split('');
    if(f.length>30) { // filename-length-limit
      cb("filename too long"); 
      return; // without this processing continues and file will be uploaded!
    }
    let pos = f.lastIndexOf('.');
    if(pos==-1) f.push("-"+Date.now()) // no suffix: at end
    else f.splice(pos,0,"-"+Date.now()); // before suffix
    let filename = f.join('');
    cb(null, filename);
  }
});

// (b) limits
let limits = {
  fileSize:1024*1024, // 1mb
  fieldNameSize:50 // "upfile"
};

// (c) fileFilter
const fileFilter = (req, file, cb) => {
  let exclude = ['exe', 'dll']; // no-suffix-files are allowed
  if(exclude.indexOf(getSuffix(file.originalname))>-1) {
    cb(null, false); // reject this file  
  } else {
    cb(null, true); // accept the file 
  }
}

// multer-upload
var upload = multer({ storage: storage, limits: limits, fileFilter: fileFilter });


// ---------------- midddleware ---------------------
var app = express();

// init cors
app.use(cors());

// /public/style.css
app.use('/public', express.static(process.cwd() + '/public'));



// ----------------- get / post ------------------
// index.html
app.get('/', (req, res)=> {
     res.sendFile(process.cwd() + '/views/index.html');
});

// GET /api/files
// get all filenames of uploaddir
app.get('/api/files', (req, res)=>{
  readDir(fs, directoryPath)
    .then(files=>res.json({"files":files}))
    .catch(err=>res.json({"error":err}));
});

// GET /api/del-files
app.get('/api/del-files', (req, res)=>{
  readDir(fs, directoryPath)
    .then(files=>{
      deleteFiles(fs, files);
      res.json({deletedFiles:files});
  })
    .catch(err=>res.json({"error":err}));
});


// POST /api/upload
/* 
form: enctype="multipart/form-data"
   input.name=upfile

creates sth like:
 upfile/edff039188e557ba9eab2afa37d41602
*/
/* [VARIANT 1]:  we cannot get 'err' here => BAD APPROACH
app.post('/api/upload', upload.single('upfile'), (req, res)=>{
  res.json({"name":req.file.originalname,"type":req.file.mimetype,"size":req.file.size});
});*/

// [VARIANT 2]:
app.post('/api/upload', function (req, res) {
  upload.single('upfile')(req, res, err=>{
    if (err instanceof multer.MulterError) {
      res.json({"upload-error":err.message}); // we surely have an err-obj
    } else if(err) {
      res.json({"error":err}); // err could be anything
    } else if(req.file==undefined){
      res.json({"error":"file rejected"}); 
    } else {
      // upload successfull
      res.json({"name":req.file.originalname,"type":req.file.mimetype,"size":req.file.size});         
    }
  })
});


// ------------------ general error-handling --------------------------
// https://gist.github.com/zcaceres/2854ef613751563a3b506fabce4501fd
// 404 Not Found
// 500 Internal Server Error

// [1] catch all requests that have not been catched before
app.use((req, res, next) => {
  let err = new Error(`tried to reach ${req.originalUrl}`);
  err.statusCode = 404;
  err.redirect = true; // custom property on err

  // if next() receives an argument, Express will assume there was an error,
  // skip all other routes, and send whatever was passed to error-handling middleware
  next(err);
});

// [2] handle status code/ display error page
app.use(function(err, req, res, next) {
  if(typeof err == 'string') err = new Error(err); // throw('foo')  
  console.error(err.message);
  
  // missing status code -> set 500 as default
  if (!err.statusCode) {
    err.statusCode = 500;
  }

  if (err.redirect) {
    if(err.statusCode==404) {
      res.sendFile(process.cwd() + '/views/error-404.html');  
    } else {
      res.sendFile(process.cwd() + '/views/error.html');  
    }
  } else {
    // send original err data
    res.status(err.statusCode).send(err.statusCode + ': ' + err.message); 
  }
});

// -------------- start listening -----------------
app.listen(process.env.PORT || 3000, function () {
  console.log('Node.js listening ...');
});
