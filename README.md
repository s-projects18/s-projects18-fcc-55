
# API Project: File Metadata Microservice for freeCodeCamp

## Usage
* create a form and call API to perform upload
* example form:
```
<form enctype="multipart/form-data" method="POST" action="/api/upload">
  <input id="inputfield" type="file" name="upfile">
  <input id="button" type="submit" value="Upload">
</form>
```

## API-commands

### POST /api/upload
* name of input-field: upfile
* save files in: /uploads (must be created manually)
* upload based on: https://www.npmjs.com/package/multer
* returns file-info as JSON:
```
{"name":"example.txt","type":"text/plain","size":1234}
```

### GET /api/files
* get all filenames of uploadDir as JSON
* ignore files beginning with '.'

### GET /api/del-files
* delete all files in directoryPath
* return deleted files as JSON
* ignore files beginning with '.'


