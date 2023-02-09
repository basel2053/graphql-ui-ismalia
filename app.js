const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const { graphqlHTTP } = require('express-graphql');

const feedRoutes = require('./routes/feed');
const authRoutes = require('./routes/auth');
const graphqlSchema = require('./graphql/schema');
const graphqlResolvers = require('./graphql/resolvers');
const auth = require('./middleware/auth');

const clearImage = require('./util/file');

const app = express();

const fileStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'images');
	},
	filename: (req, file, cb) => {
		cb(null, new Date().toISOString() + '-' + file.originalname);
	},
});

const fileFilter = (req, file, cb) => {
	if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
		cb(null, true);
	} else {
		cb(null, false);
	}
};

// app.use(bodyParser.urlencoded()); // x-www-form-urlencoded <form>
app.use(bodyParser.json()); // application/json
app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single('image'));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, PATCH, DELETE');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	if (req.method === 'OPTIONS') {
		return res.sendStatus(200);
	}
	next();
});

// a middleware that we want to run before the graphql
// for uploading images
app.use(auth);
app.put('/post-image', (req, res, next) => {
	if (!req.isAuth) {
		throw new Error('not authetnicated');
	}
	if (!req.file) {
		return res.status(200).json({ message: 'no File provided' });
	}
	if (req.body.oldPath) {
		clearImage(req.body.oldPath);
	}
	return res.status(201).json({ message: 'File stored', filePath: req.file.path });
});
app.use(
	'/graphql',
	graphqlHTTP({
		schema: graphqlSchema,
		rootValue: graphqlResolvers,
		graphiql: true,
		// customFormatErrorFn, // replaces formatError
		formatError(err) {
			if (!err.originalError) {
				return err;
			}
			// originalError is the error we throw ex: validation
			const data = err.originalError.data;
			const message = err.message || 'error occurred';
			const code = err.originalError.code || 500;
			return { message, code, data };
		},
	})
);

app.use((error, req, res, next) => {
	console.log(error);
	const status = error.statusCode || 500;
	const message = error.message;
	const data = error.data;
	res.status(status).json({ message: message, data: data });
});

mongoose
	.connect('mongodb://127.0.0.1:27017/graphQlMax')
	.then(result => {
		const server = app.listen(3000);
	})
	.catch(err => console.log(err));
