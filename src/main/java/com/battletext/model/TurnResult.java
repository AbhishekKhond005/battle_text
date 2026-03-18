package com.battletext.model;

import lombok.Data;

@Data
public class TurnResult {
    private boolean valid;
    private String message;
    
    private String humanWord;
    private int humanWordScore;
    private boolean isUniqueWord;
    private int uniqueWordBonus;
    
    private String cpuWord;
    private int cpuWordScore;
    
    private GameState gameState;
}
