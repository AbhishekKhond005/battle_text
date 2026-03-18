package com.battletext.repository;

import com.battletext.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.Set;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByGoogleId(String googleId);
    Optional<User> findByEmail(String email);
    
    default User findOrCreateByGoogleId(String googleId, String email, String username, String icon) {
        return findByGoogleId(googleId).orElseGet(() -> {
            User newUser = new User(googleId, email, username, icon);
            newUser.getUnlockedLevels().put("Adam", "0");
            newUser.getUnlockedLevels().put("Eve", "0");
            return save(newUser);
        });
    }
    
    default Set<Integer> getUnlockedLevelIndices(String googleId, String botName) {
        return findByGoogleId(googleId).map(u -> u.getUnlockedLevelIndices(botName)).orElse(Set.of(0));
    }
}
