<?php
declare(strict_types=1);

   
                                          
   
class Challenge {
    public $id;
    public $name;
    public $title;
    public $description;
    public $type;
    public $condition_type;
    public $condition_value;
    public $condition_json;
    public $reward_type;
    public $reward_value;
    public $reward_json;
    public $active;
    public $start_at;
    public $end_at;
    public $expiration_date;
    public $created_at;

    public function __construct($name = '', $condition_type = '', $condition_value = 0, $reward_type = '', $reward_value = 0) {
        $this->name = $name;
        $this->condition_type = $condition_type;
        $this->condition_value = $condition_value;
        $this->reward_type = $reward_type;
        $this->reward_value = $reward_value;
        $this->active = true;
    }
}
?>
