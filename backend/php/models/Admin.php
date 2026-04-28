<?php
declare(strict_types=1);

class Admin {
    public $id;
    public $email;
    public $role;
    public $status;

    public function __construct($email = '', $role = 'admin') {
        $this->email = $email;
        $this->role = $role;
        $this->status = 'active';
    }
}
