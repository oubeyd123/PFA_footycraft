<?php
declare(strict_types=1);

   
                                      
   
class Chest {
    public $id;
    public $user_id;
    public $chest_type;
    public $opened;
    public $created_at;
    public $opened_at;
    public $next_available_at;

    public function __construct($user_id = 0, $chest_type = 'common') {
        $this->user_id = $user_id;
        $this->chest_type = $chest_type;
        $this->opened = false;
    }
}
?>
