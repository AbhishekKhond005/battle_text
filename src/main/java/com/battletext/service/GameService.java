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
        // Load per-letter word files from /words/<letter>.txt
        for (char c = 'a'; c <= 'z'; c++) {
            String resourcePath = "/words/" + c + ".txt";
            try (InputStream is = getClass().getResourceAsStream(resourcePath)) {
                if (is == null) {
                    // No file for this letter – skip silently
                    continue;
                }
                BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
                String line;
                while ((line = reader.readLine()) != null) {
                    String word = line.trim().toLowerCase();
                    if (word.length() > 0 && word.matches("^[a-z]+$")) {
                        char firstChar = word.charAt(0);
                        dictionary.computeIfAbsent(firstChar, k -> new ArrayList<>()).add(word);
                    }
                }
            } catch (Exception e) {
                System.err.println("Failed to load words for letter " + c + ": " + e.getMessage());
            }
        }
        // Sort each list by length descending for AI selection
        for (List<String> list : dictionary.values()) {
            list.sort(Comparator.comparingInt(String::length).reversed());
        }
        System.out.println("Loaded dictionary with " + dictionary.size() + " letter groups.");
    }

    public boolean isValidWord(String word) {
        if (word == null || word.isEmpty())
            return false;
        word = word.toLowerCase();
        char firstChar = word.charAt(0);
        List<String> words = dictionary.get(firstChar);
        return words != null && words.contains(word);
    }

    // -------------------------------------------------------------------------
    // Gimmick helpers
    // -------------------------------------------------------------------------

    /**
     * Returns the forced letter if the gimmick is FIXED_LETTER:<X>, otherwise null.
     */
    private Character getFixedLetter(String gimmick) {
        if (gimmick != null && gimmick.startsWith("FIXED_LETTER:")) {
            return gimmick.charAt("FIXED_LETTER:".length());
        }
        return null;
    }

    private int getMinWordLength(String gimmick) {
        if (gimmick != null && gimmick.startsWith("MIN_WORD_LENGTH:")) {
            try {
                return Integer.parseInt(gimmick.substring("MIN_WORD_LENGTH:".length()));
            } catch (NumberFormatException ignored) {
            }
        }
        return 1; // no restriction
    }

    private boolean isDoubleScore(String gimmick) {
        return "DOUBLE_SCORE".equals(gimmick);
    }

    // -------------------------------------------------------------------------
    // Turn processing
    // -------------------------------------------------------------------------

    public TurnResult processHumanTurn(GameState gameState, String humanWord) {
        TurnResult result = new TurnResult();
        humanWord = humanWord.toLowerCase().trim();
        String gimmick = gameState.getActiveGimmick();

        // 1. Validate game state
        if (gameState.isGameOver()) {
            result.setValid(false);
            result.setMessage("Game is already over.");
            return result;
        }

        // 2. Determine the required starting letter (gimmick may override)
        String required = gameState.getRequiredStartingLetter();
        if (required != null && !required.equals("?")) {
            // FIXED_LETTER gimmick — the required letter is always the fixed one
            Character fixedLetter = getFixedLetter(gimmick);
            String effectiveRequired = (fixedLetter != null)
                    ? String.valueOf(fixedLetter)
                    : required;

            if (!humanWord.startsWith(effectiveRequired)) {
                result.setValid(false);
                result.setMessage("Word must start with '" + effectiveRequired.toUpperCase() + "'.");
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

        // 3. Human turn succeeds
        int humanScore = humanWord.length();
        gameState.setHumanScore(gameState.getHumanScore() + humanScore);
        gameState.addUsedWord(humanWord);
        gameState.setLastWordPlayed(humanWord);

        // Next required letter: fixed gimmick overrides the chain rule
        Character fixedLetter = getFixedLetter(gimmick);
        if (fixedLetter != null) {
            gameState.setRequiredStartingLetter(String.valueOf(fixedLetter));
        } else {
            gameState.setRequiredStartingLetter(String.valueOf(humanWord.charAt(humanWord.length() - 1)));
        }

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

        String gimmick = gameState.getActiveGimmick();

        // Determine the letter the CPU must start with (gimmick may override)
        Character fixedLetter = getFixedLetter(gimmick);
        char cpuStartChar = (fixedLetter != null)
                ? fixedLetter
                : gameState.getRequiredStartingLetter().charAt(0);

        String cpuWord = determineCpuWord(gameState, cpuStartChar);

        if (cpuWord == null) {
            // CPU skips — next starting letter obeys gimmick
            char nextLetter = (fixedLetter != null) ? fixedLetter : (char) ('a' + random.nextInt(26));
            gameState.setRequiredStartingLetter(String.valueOf(nextLetter));
            result.setCpuWord("SKIPPED!");
            result.setCpuWordScore(0);
        } else {
            int rawScore = cpuWord.length();
            int cpuScore = isDoubleScore(gimmick) ? rawScore * 2 : rawScore;

            gameState.setCpuScore(gameState.getCpuScore() + cpuScore);
            gameState.addUsedWord(cpuWord);
            gameState.setLastWordPlayed(cpuWord);

            // Next required letter: gimmick or chain
            if (fixedLetter != null) {
                gameState.setRequiredStartingLetter(String.valueOf(fixedLetter));
            } else {
                gameState.setRequiredStartingLetter(String.valueOf(cpuWord.charAt(cpuWord.length() - 1)));
            }

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
        String gimmick = gameState.getActiveGimmick();
        int difficulty = gameState.getDifficultyLevel(); // 1 to 8

        // Skip chance for low-difficulty bots
        if (difficulty <= 3) {
            int skipChance = (4 - difficulty) * 5; // Level 1: 15%, 2: 10%, 3: 5%
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

        // Apply MIN_WORD_LENGTH gimmick filter
        int minLen = getMinWordLength(gimmick);
        List<String> gimmickFiltered = available.stream()
                .filter(w -> w.length() >= minLen)
                .collect(Collectors.toList());
        // Fallback to full available list if gimmick filter leaves nothing
        if (!gimmickFiltered.isEmpty()) {
            available = gimmickFiltered;
        }

        // Define target lengths roughly based on difficulty
        int minTargetLength = Math.min(difficulty + 2, 8);
        int maxTargetLength = difficulty == 8 ? 20 : difficulty + 4;

        List<String> validTargets = available.stream()
                .filter(w -> {
                    int len = w.length();
                    if (difficulty == 8)
                        return len >= 7;
                    return len >= minTargetLength && len <= maxTargetLength;
                })
                .collect(Collectors.toList());

        if (!validTargets.isEmpty()) {
            return validTargets.get(random.nextInt(validTargets.size()));
        }

        // Fallback: high difficulty picks long words, low picks short
        if (difficulty >= 5) {
            return available.get(random.nextInt(Math.min(10, available.size())));
        } else {
            return available.get(available.size() - 1 - random.nextInt(Math.min(10, available.size())));
        }
    }
}
