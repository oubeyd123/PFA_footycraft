<?php
declare(strict_types=1);

global $cnx;

$cnx = new PDO(
    'pgsql:host=db;port=5432;dbname=footycraft',
    'footycraft',
    'footycraft',
    [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]
);
