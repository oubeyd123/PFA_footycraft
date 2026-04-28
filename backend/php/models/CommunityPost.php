<?php
declare(strict_types=1);

   
                                                           
   
class CommunityPost {
    public $id;
    public $user_id;
    public $username;
    public $content;
    public $image_url;
    public $category;
    public $likes_count;
    public $comment_count;
    public $created_at;
    public $updated_at;
    public $comments = [];

    public function __construct($id = 0, $user_id = 0, $username = '', $content = '', $category = 'general') {
        $this->id = $id;
        $this->user_id = $user_id;
        $this->username = $username;
        $this->content = $content;
        $this->category = $category;
        $this->likes_count = 0;
        $this->comment_count = 0;
    }
}
?>
