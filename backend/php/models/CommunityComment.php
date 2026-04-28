<?php
declare(strict_types=1);

   
                                                                 
   
class CommunityComment {
    public $id;
    public $post_id;
    public $user_id;
    public $username;
    public $content;
    public $likes_count;
    public $created_at;
    public $updated_at;

    public function __construct($id = 0, $post_id = 0, $user_id = 0, $username = '', $content = '') {
        $this->id = $id;
        $this->post_id = $post_id;
        $this->user_id = $user_id;
        $this->username = $username;
        $this->content = $content;
        $this->likes_count = 0;
    }
}
?>
