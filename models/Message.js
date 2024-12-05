
// models/Message.js
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.js";

class Message extends Model {}

Message.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "User",
        key: "id",
      },
    },
    conversationId: {
      type: DataTypes.UUID,
      allowNull: false,

    },
    readBy: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
    },
    messageType: {
      type: DataTypes.ENUM('text', 'image', 'file'),
      defaultValue: 'text',
    },
    fileUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "message",
    timestamps: true,
  }
);

export default Message;