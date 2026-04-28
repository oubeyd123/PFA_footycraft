<?php
declare(strict_types=1);

   
                                                               
   
class CommunityReport {
    public $id;
    public $post_id;
    public $reporter_id;
    public $reporter_username;
    public $reason;
    public $description;
    public $status;
    public $created_at;
    public $updated_at;

    public function __construct($id = 0, $post_id = 0, $reporter_id = 0, $reason = '', $status = 'open') {
        $this->id = $id;
        $this->post_id = $post_id;
        $this->reporter_id = $reporter_id;
        $this->reason = $reason;
        $this->status = $status;
    }
}
?>
