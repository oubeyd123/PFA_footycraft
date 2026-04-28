<?php
declare(strict_types=1);

   
                                     
   
class User {
    public $id;
    public $username;
    public $email;
    public $password_hash;
    public $division_level;
    public $division_points;
    public $division_matches_played;
    public $division_wins;
    public $division_draws;
    public $division_losses;
    public $division_goals_for;
    public $division_goals_against;
    public $division_form;
    public $active_lineup_id;
    public $google_id;
    public $facebook_id;
    public $apple_id;
    public $onboarding_completed_at;
    public $created_at;
    public $updated_at;

    public function __construct($username = '', $email = '', $password_hash = '') {
        $this->username = $username;
        $this->email = $email;
        $this->password_hash = $password_hash;
        $this->division_level = 5;
        $this->division_points = 0;
        $this->division_matches_played = 0;
        $this->division_wins = 0;
        $this->division_draws = 0;
        $this->division_losses = 0;
        $this->division_goals_for = 0;
        $this->division_goals_against = 0;
        $this->division_form = '[]';
    }
}
?>
