package com.battletext.service;

import com.battletext.model.GameState;
import com.battletext.model.TurnResult;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class GameService {
    // Map of Character (starting letter) to list of words starting with that letter
    private final Map<Character, List<String>> dictionary = new HashMap<>();
    private final Random random = new Random();

    @PostConstruct
    public void init() {
        try (InputStream is = getClass().getResourceAsStream("/words.txt");
                BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {

            String line;
            while ((line = reader.readLine()) != null) {
                String word = line.trim().toLowerCase();
                if (word.length() > 0 && word.matches("^[a-z]+$")) {
                    char firstChar = word.charAt(0);
                    dictionary.computeIfAbsent(firstChar, k -> new ArrayList<>()).add(word);
                }
            }

            // Sort each list by length descending to make it easier for higher difficulty
            // AIs to pick longer words
            for (List<String> list : dictionary.values()) {
                list.sort(Comparator.comparingInt(String::length).reversed());
            }
            System.out.println("Loaded dictionary. Total entries for 'a': "
                    + dictionary.getOrDefault('a', Collections.emptyList()).size());
        } catch (Exception e) {
            e.printStackTrace();
            System.err.println("Failed to load dictionary.");
        }
    }

    public boolean isValidWord(String word) {
        if (word == null || word.isEmpty())
            return false;
        word = word.toLowerCase();
        char firstChar = word.charAt(0);
        List<String> words = dictionary.get(firstChar);
        return words != null && words.contains(word);
    }

    public TurnResult processHumanTurn(GameState gameState, String humanWord) {
        TurnResult result = new TurnResult();
        humanWord = humanWord.toLowerCase().trim();

        // 1. Validate constraints
        if (gameState.isGameOver()) {
            result.setValid(false);
            result.setMessage("Game is already over.");
            return result;
        }

        // Allow any starting letter if the previous turn was skipped or it's the very
        // first letter
        if (gameState.getRequiredStartingLetter() != null && !gameState.getRequiredStartingLetter().equals("?")) {
            if (!humanWord.startsWith(gameState.getRequiredStartingLetter())) {
                result.setValid(false);
                result.setMessage(
                        "Word must start with '" + gameState.getRequiredStartingLetter().toUpperCase() + "'.");
                return result;
            }
        }

        if (!isValidWord(humanWord)) {
            result.setValid(false);
            result.setMessage("Not a valid word.");
            return result;
        }

        if (gameState.isWordUsed(humanWord)) {
            result.setValid(false);
            result.setMessage("Word already used.");
            return result;
        }

        // 2. Human turn succeeds
        int humanScore = humanWord.length();
        gameState.setHumanScore(gameState.getHumanScore() + humanScore);
        gameState.addUsedWord(humanWord);
        gameState.setLastWordPlayed(humanWord);
        gameState.setRequiredStartingLetter(String.valueOf(humanWord.charAt(humanWord.length() - 1)));

        result.setValid(true);
        result.setHumanWord(humanWord);
        result.setHumanWordScore(humanScore);

        if (gameState.getHumanScore() >= gameState.getTargetScore()) {
            gameState.setGameOver(true);
            gameState.setWinner("HUMAN");
        }

        result.setGameState(gameState);
        return result;
    }

    public TurnResult processCpuTurn(GameState gameState) {
        TurnResult result = new TurnResult();
        result.setValid(true); // CPU moves are inherently valid

        if (gameState.isGameOver()) {
            result.setGameState(gameState);
            return result;
        }

        char cpuRequiredStartingLetter = gameState.getRequiredStartingLetter().charAt(0);
        String cpuWord = determineCpuWord(gameState, cpuRequiredStartingLetter);

        if (cpuWord == null) {
            // CPU skips a turn. Human gets to play next! Give a random letter to start
            // from.
            char randomLetter = (char) ('a' + random.nextInt(26));
            gameState.setRequiredStartingLetter(String.valueOf(randomLetter));

            result.setCpuWord("SKIPPED!");
            result.setCpuWordScore(0);
        } else {
            int cpuScore = cpuWord.length();
            gameState.setCpuScore(gameState.getCpuScore() + cpuScore);
            gameState.addUsedWord(cpuWord);
            gameState.setLastWordPlayed(cpuWord);
            gameState.setRequiredStartingLetter(String.valueOf(cpuWord.charAt(cpuWord.length() - 1)));

            result.setCpuWord(cpuWord);
            result.setCpuWordScore(cpuScore);

            if (gameState.getCpuScore() >= gameState.getTargetScore()) {
                gameState.setGameOver(true);
                gameState.setWinner("CPU");
            }
        }

        result.setGameState(gameState);
        return result;
    }

    private String determineCpuWord(GameState gameState, char startingLetter) {
        int difficulty = gameState.getDifficultyLevel(); // 1 to 8

        // Random chance to skip based on difficulty
        if (difficulty <= 3) {
            int skipChance = (4 - difficulty) * 5; // Level 1: 15%, 2: 10%, 3: 5% chance
            if (random.nextInt(100) < skipChance) {
                return null;
            }
        }

        List<String> pool = dictionary.getOrDefault(startingLetter, Collections.emptyList());
        if (pool.isEmpty())
            return null;

        // Filter out used words
        List<String> available = pool.stream()
                .filter(w -> !gameState.isWordUsed(w))
                .collect(Collectors.toList());

        if (available.isEmpty())
            return null;

        // Define target lengths roughly based on difficulty
        int minTargetLength = Math.min(difficulty + 2, 8);
        int maxTargetLength = difficulty == 8 ? 20 : difficulty + 4; // 8 will pick any longest

        // Try to find words matching target length
        List<String> validTargets = available.stream()
                .filter(w -> {
                    int len = w.length();
                    if (difficulty == 8)
                        return len >= 7; // Level 8 seeks large words
                    return len >= minTargetLength && len <= maxTargetLength;
                })
                .collect(Collectors.toList());

        // Fallback or Random selection
        if (!validTargets.isEmpty()) {
            return validTargets.get(random.nextInt(validTargets.size()));
        }

        // Fallback: pick any available word.
        // A low difficulty might pick the bottom of the list (shortest words).
        // A high difficulty might pick the top (longest words).
        if (difficulty >= 5) {
            return available.get(random.nextInt(Math.min(10, available.size())));
        } else {
            return available.get(available.size() - 1 - random.nextInt(Math.min(10, available.size())));
        }
    }
}
