package com.battletext.model;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class BotLevel {
    private int index; // 0-based index within the bot's level list
    private String name; // Display name, e.g. "Rookie"
    private String description; // Flavor text
    private int difficultyValue; // 1-8, used internally for word picking
    private int targetScore; // Points needed to win this level
    private String gimmick; // null = none, "FIXED_LETTER:g", "MIN_WORD_LENGTH:7", "DOUBLE_SCORE"
}
