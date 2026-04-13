package com.battletext.model;

import lombok.Data;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Data
public class GameState {
    private String id;
    private String botName;
    private int levelIndex;
    private int difficultyLevel; // 1 to 8
    private int targetScore;

    private int humanScore;
    private int cpuScore;
    private String cpuName;

    private String requiredStartingLetter;
    private Set<String> usedWords = new HashSet<>();
    private List<String> botWords = new ArrayList<>();

    private String lastWordPlayed;

    private boolean isGameOver;
    private String winner; // "HUMAN" or "CPU"
    private String activeGimmick; // null or e.g. "FIXED_LETTER:G"
    private String activeGimmickDescription; // human-readable description for UI

    public void addUsedWord(String word) {
        usedWords.add(word);
    }

    public boolean isWordUsed(String word) {
        return usedWords.contains(word);
    }

    public void addBotWord(String word) {
        botWords.add(word);
    }

    public List<String> getBotWords() {
        return botWords;
    }
}
