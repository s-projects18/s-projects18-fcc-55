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
https://www.npmjs.com/package/multer:
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
const uploadDir = 'uploads'; // create manually on console!
const directoryPath = path.join(__dirname, uploadDir);

const readDir = (fs, directoryPath) => {
  return new Promise((resolve, reject)=>{  
    fs.readdir(directoryPath, function (err, files) {
      if(err) {
        console.log('Unable to scan directory: ' + err);
        reject(err);
      } 
      resolve(files);
    });  
  });
}


// ---------------- config multer ----------------------
// [1] simple version
// this automatically creates an /uploads-folder
// can be seen in Glitch in console
// remove unwanted folder in console: rm -R foofolder
// files are stored this way:
// upfile/edff039188e557ba9eab2afa37d41602
//var upload = multer({ dest: uploadDir });

// [2] custom storage
// folder will NOT be created automatically
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    let f = file.originalname.split('');
    if(f.length>30) cb("filename too long"); // filename-length-limit
    let pos = f.lastIndexOf('.');
    if(pos==-1) f.push("-"+Date.now()) // no suffix: at end
    else f.splice(pos,0,"-"+Date.now()); // before suffix
    let filename = f.join('');
    cb(null, filename);
  }
});
var limits = {
  fileSize:1024*1024, // 1mb
  fieldNameSize:50 // "upfile"
};
var upload = multer({ storage: storage, limits:limits });


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

/* /api/upload
form: enctype="multipart/form-data"
   input.name=upfile

creates sth like:
 upfile/edff039188e557ba9eab2afa37d41602
*/
/* [VARIANT 1]:  we cannot get 'err' here => BAD APPOACH
app.post('/api/upload', upload.single('upfile'), (req, res)=>{
  res.json({"name":req.file.originalname,"type":req.file.mimetype,"size":req.file.size});
});*/

// [VARIANT 2]:
app.post('/api/upload', function (req, res) {
  upload.single('upfile')(req, res, err=>{
    if (err instanceof multer.MulterError) {
      res.json({"upload-error":err.message}); // we surely have an err-obj
    } else if (err) {
      res.json({"error":err}); // err could be anything
    } else {
      // upload successfull
      res.json({"name":req.file.originalname,"type":req.file.mimetype,"size":req.file.size});      
    }
  })
})



// -------------- start listening -----------------
app.listen(process.env.PORT || 3000, function () {
  console.log('Node.js listening ...');
});
