package com.battletext.model;

import lombok.Data;
import java.util.List;

@Data
public class BotConfig {
    private String name;
    private String avatar; // Emoji avatar for display
    private String description; // Short bio
    private List<BotLevel> levels;

    public BotConfig(String name, String avatar, String description, List<BotLevel> levels) {
        this.name = name;
        this.avatar = avatar;
        this.description = description;
        this.levels = levels;
    }
}
