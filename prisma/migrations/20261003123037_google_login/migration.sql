-- AlterTable
ALTER TABLE `oauth_connections` MODIFY `provider` ENUM('strava', 'github', 'wakatime', 'google') NOT NULL;
