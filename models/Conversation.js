// models/Conversation.js
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.js";

class Conversation extends Model {}

Conversation.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    type: {
      type: DataTypes.ENUM('private', 'group'),
      defaultValue: 'private',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true, // Only required for group conversations
    },
    lastMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    lastMessageTime: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "conversation",
    timestamps: true,
  }
);
export default Conversation;