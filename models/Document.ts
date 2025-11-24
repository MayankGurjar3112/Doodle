import mongoose, { Schema, model, models } from "mongoose";

const DocumentSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name for this document."],
      maxlength: [60, "Name cannot be more than 60 characters"],
    },
    authorId: {
      type: String,
      required: true,
    },
    content: {
      type: Schema.Types.Mixed, // Store JSON/Object data for the whiteboard
      default: {},
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    archived: {
      type: Boolean,
      default: false,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    allowedEmails: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true, // Automatically handles createdAt and updatedAt
  }
);

export default models.Document || model("Document", DocumentSchema);
