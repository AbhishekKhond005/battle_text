package com.battletext.model;

import lombok.Data;
import java.util.HashSet;
import java.util.Set;

@Data
public class GameState {
    private String id;
    private int difficultyLevel; // 1 to 8
    private int targetScore;

    private int humanScore;
    private int cpuScore;
    private String cpuName;

    private String requiredStartingLetter;
    private Set<String> usedWords = new HashSet<>();

    private String lastWordPlayed;

    private boolean isGameOver;
    private String winner; // "HUMAN" or "CPU"

    public void addUsedWord(String word) {
        usedWords.add(word);
    }

    public boolean isWordUsed(String word) {
        return usedWords.contains(word);
    }
}
