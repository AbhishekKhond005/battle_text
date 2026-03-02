package com.battletext.controller;

import com.battletext.model.User;
import com.battletext.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/user")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal OAuth2User principal) {
        try {
            if (principal == null) {
                return ResponseEntity.ok(Map.of("loggedIn", false));
            }

            String googleId = principal.getAttribute("sub");
            if (googleId == null) {
                // Not a google user or missing ID? logout
                return ResponseEntity.ok(Map.of("loggedIn", false, "error", "Invalid session"));
            }

            Optional<User> userOpt = userRepository.findByGoogleId(googleId);
            
            String email = principal.getAttribute("email");
            String picture = principal.getAttribute("picture");

            if (userOpt.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                        "loggedIn", true,
                        "needsSetup", true,
                        "email", email != null ? email : "",
                        "picture", picture != null ? picture : ""));
            }

            User user = userOpt.get();
            return ResponseEntity.ok(Map.of(
                    "loggedIn", true,
                    "needsSetup", false,
                    "username", user.getUsername(),
                    "icon", user.getIcon(),
                    "gamesPlayed", user.getGamesPlayed(),
                    "email", email != null ? email : "",
                    "picture", picture != null ? picture : ""));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("loggedIn", false, "error", e.getMessage()));
        }
    }

    @PostMapping("/setup")
    public ResponseEntity<?> setupUser(@AuthenticationPrincipal OAuth2User principal,
            @RequestBody Map<String, String> body) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }

        String googleId = principal.getAttribute("sub");
        String username = body.get("username");
        String icon = body.get("icon");

        if (username == null || username.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username is required"));
        }

        if (icon == null) {
            icon = "robot";
        }

        Optional<User> existingUser = userRepository.findByGoogleId(googleId);
        User user;
        if (existingUser.isPresent()) {
            user = existingUser.get();
            // Only update username if it's currently empty/null (new user)
            if (user.getUsername() == null || user.getUsername().trim().isEmpty()) {
                user.setUsername(username);
            }
            if (icon != null) {
                user.setIcon(icon);
            }
        } else {
            String email = principal.getAttribute("email");
            user = new User(googleId, email, username, icon);
        }

        user = userRepository.save(user);
        return ResponseEntity.ok(Map.of(
                "username", user.getUsername(),
                "icon", user.getIcon(),
                "gamesPlayed", user.getGamesPlayed()));
    }

    @PostMapping("/update-profile")
    public ResponseEntity<?> updateProfile(@AuthenticationPrincipal OAuth2User principal,
            @RequestBody Map<String, String> body) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }

        String googleId = principal.getAttribute("sub");
        Optional<User> userOpt = userRepository.findByGoogleId(googleId);

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        }

        User user = userOpt.get();
        if (body.containsKey("username")) {
            user.setUsername(body.get("username"));
        }
        if (body.containsKey("icon")) {
            user.setIcon(body.get("icon"));
        }

        user = userRepository.save(user);
        return ResponseEntity.ok(Map.of(
                "username", user.getUsername(),
                "icon", user.getIcon(),
                "gamesPlayed", user.getGamesPlayed()));
    }

    @PostMapping("/increment-games")
    public ResponseEntity<?> incrementGamesPlayed(@AuthenticationPrincipal OAuth2User principal) {
        if (principal == null) {
            return ResponseEntity.ok(Map.of("loggedIn", false));
        }

        String googleId = principal.getAttribute("sub");
        Optional<User> userOpt = userRepository.findByGoogleId(googleId);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setGamesPlayed(user.getGamesPlayed() + 1);
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("gamesPlayed", user.getGamesPlayed()));
        }

        return ResponseEntity.ok(Map.of("gamesPlayed", 0));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        return ResponseEntity.ok(Map.of("success", true));
    }
}
