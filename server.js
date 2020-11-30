const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const app = express();
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const methodOverride = require('method-override');
const URI = process.env.MONGODB_URI



app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(morgan('dev'));

app.set('view engine', 'ejs');

// create a storage object
const storage = new GridFsStorage({
    url: URI,
    options: { useUnifiedTopology: true },
    file: (req, file) => {
      return {
        filename: 'image_' + Date.now() + path.extname(file.originalname),
        bucketName: 'photos'
      }; 
    }
});

// set multer storage engine
const upload = multer({ storage });

//  create a connection instance to mongodb
const connect = mongoose.createConnection(URI,  { useNewUrlParser: true, useUnifiedTopology: true });


// initialize gridfs stream
let gfs;

connect.once('open', () => {
    gfs = new mongoose.mongo.GridFSBucket(connect.db, {
        bucketName: 'photos'
    });
});



// create model
const shitSchema = new Schema({
    description: String,
    filename: String
});
const Shit = connect.model('shits', shitSchema);


app.get('/', (req, res) => {
    gfs.find().toArray((err, files) => {
        res.render('index', { files });
    });
});




app.post('/', upload.single('image'), (req, res, next) => {
    console.log('req.body :>> ', req.body);
    console.log('req.file :>> ', req.file);
    let newShit = new Shit({
        description: req.body.description,
        filename: req.file.filename
    });
    newShit.save()
        .then(something => res.status(200).json({ success: 'ok' }))
        .catch(err => console.log(err))
});

app.get('/images', (req, res, next) => {
    gfs.find().toArray((err, files) => {
        if (!files || files.length === 0){
            return res.status(200).json({
                success: false,
                message: 'No files avaialable'
            });
        }

        res.status(200).json({
            success: true,
            files
        });
    });
});

// render to browser
app.get('/image/:filename', (req, res, next) => {
    gfs.find({ filename: req.params.filename }).toArray((err, files) => {

        if (!files[0] || files.length === 0) {
            return res.status(200).json({
                success: false,
                message: 'No files available'
            });
        }

        if (files[0].contentType === 'image/jpeg'
            || files[0].contentType === 'image/png'
            || files[0].contentType === 'image/svg+xml') {
            // read & write stream using pipe
            gfs.openDownloadStreamByName(req.params.filename).pipe(res);
        } else {
            res.status(404).json({
                err: 'Not an image'
            });
        }


    });
});


app.get('/image/file/:filename', (req, res, next) => {
    gfs.find({ filename: req.params.filename }).toArray((err, files) => {

        if (!files[0] || files.length === 0) {
            return res.status(200).json({
                success: false,
                message: 'No files available'
            });
        }

        console.log(files[0]);
        res.status(200).json({ files: files[0] });
    });
    
    
});


// delete

app.get('/image/delete/:id', (req, res, next) => {
    gfs.delete(new mongoose.Types.ObjectId(req.params.id), (err, data) => {
        if (err) {
            return res.status(404).json({ err });
        }
        // delete Schema
        // ...
        res.status(200).json({
            success: true,
            message: `File with ID ${req.params.id} was delete`
        });
    });
});


const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Port at ${port}`));