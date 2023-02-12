const mongoose = require('mongoose');

const { Schema } = mongoose;

const postSchema = new Schema(
	{
		title: {
			type: String,
			require: true,
		},
		content: {
			type: String,
			require: true,
		},
		userId: {
			type: Schema.Types.ObjectId,
			ref: 'User',
		},
	},
	{
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

postSchema.virtual('comments', {
	ref: 'Comment',
	localField: '_id',
	foreignField: 'postId',
});

const Post = mongoose.model('Post', postSchema);
module.exports = Post;
