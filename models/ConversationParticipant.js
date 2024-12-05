// models/ConversationParticipant.js
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.js";

class ConversationParticipant extends Model {}

ConversationParticipant.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: [
        {
          model: "User",
          key: "id",
        },
    ]
    },
    conversationId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    isAdmin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    lastRead: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "conversationParticipant",
    timestamps: true,
  }
);

export default ConversationParticipant;