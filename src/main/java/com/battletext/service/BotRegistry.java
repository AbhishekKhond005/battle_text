package com.battletext.service;

import com.battletext.model.BotConfig;
import com.battletext.model.BotLevel;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Holds all registered bots and their levels.
 * To add a new bot: create a new BotConfig and put it into the registry.
 *
 * GIMMICK NOTE: FIXED_LETTER values must be lowercase (e.g. "FIXED_LETTER:g")
 * so they match the dictionary keys and lowercased user input.
 */
@Component
public class BotRegistry {

    private final Map<String, BotConfig> bots = new LinkedHashMap<>();

    public BotRegistry() {
        // ---- ADAM (8 levels) ----
        bots.put("Adam", new BotConfig(
                "Adam",
                "🤖",
                "The original challenger. Straightforward but relentless.",
                Arrays.asList(
                        new BotLevel(0, "Rookie", "Still learning the ropes.", 1, 30, null),
                        new BotLevel(1, "Apprentice", "Getting warmed up.", 2, 40, null),
                        new BotLevel(2, "Letter Lock", "Every word must start with 'G'!", 3, 30, "FIXED_LETTER:g"),
                        new BotLevel(3, "Balanced", "A fair fight.", 4, 50, null),
                        new BotLevel(4, "Clever", "Picks words with intention.", 5, 60, null),
                        new BotLevel(5, "Wordsmith", "Prefers long powerful words.", 6, 70, "MIN_WORD_LENGTH:7"),
                        new BotLevel(6, "Veteran", "Decades of word battle experience.", 7, 80, null),
                        new BotLevel(7, "God Mode", "CPU earns double points — good luck!", 8, 100, "DOUBLE_SCORE"))));

        // ---- EVE (5 levels) ----
        bots.put("Eve", new BotConfig(
                "Eve",
                "🤖",
                "Cunning and unpredictable. Every match is a surprise.",
                Arrays.asList(
                        new BotLevel(0, "Curious", "Just exploring.", 1, 25, null),
                        new BotLevel(1, "Playful", "Toying with you.", 3, 40, null),
                        new BotLevel(2, "Quick Q Hunt", "Every word must start with 'Q'!", 4, 30, "FIXED_LETTER:q"),
                        new BotLevel(3, "Sharp", "Strikes with precision.", 6, 60, null),
                        new BotLevel(4, "Ruthless", "CPU earns double points — good luck!", 8, 80, "DOUBLE_SCORE"))));
    }

    public Map<String, BotConfig> getBots() {
        return bots;
    }

    public BotConfig getBot(String name) {
        return bots.get(name);
    }
}
