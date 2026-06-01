<?php

/**
 * This file has been auto-generated
 * by the Symfony Routing Component.
 */

return [
    false, // $matchHost
    [ // $staticRoutes
        '/login' => [[['_route' => 'api_login', '_controller' => 'App\\Controller\\AuthController::login'], null, ['POST' => 0], null, false, false, null]],
        '/register' => [[['_route' => 'api_register', '_controller' => 'App\\Controller\\AuthController::register'], null, ['POST' => 0], null, false, false, null]],
        '/users' => [[['_route' => 'users_list', '_controller' => 'App\\Controller\\AuthController::listUsers'], null, ['GET' => 0], null, false, false, null]],
        '/companies' => [[['_route' => 'companies_index', '_controller' => 'App\\Controller\\CompanyController::index'], null, ['GET' => 0], null, false, false, null]],
        '/' => [[['_route' => 'home', '_controller' => 'App\\Controller\\DefaultController::index'], null, ['GET' => 0], null, false, false, null]],
        '/jobs' => [[['_route' => 'jobs_index', '_controller' => 'App\\Controller\\JobController::index'], null, ['GET' => 0], null, false, false, null]],
        '/schools' => [[['_route' => 'schools_index', '_controller' => 'App\\Controller\\SchoolController::index'], null, ['GET' => 0], null, false, false, null]],
        '/students' => [
            [['_route' => 'students_index', '_controller' => 'App\\Controller\\StudentController::index'], null, ['GET' => 0], null, false, false, null],
            [['_route' => 'students_create', '_controller' => 'App\\Controller\\StudentController::create'], null, ['POST' => 0], null, false, false, null],
        ],
    ],
    [ // $regexpList
        0 => '{^(?'
                .'|/_error/(\\d+)(?:\\.([^/]++))?(*:35)'
                .'|/users/([^/]++)(?'
                    .'|(*:60)'
                    .'|/pending\\-(?'
                        .'|school(*:86)'
                        .'|company(*:100)'
                    .')'
                .')'
                .'|/companies/([^/]++)(*:129)'
                .'|/jobs/([^/]++)(*:151)'
                .'|/s(?'
                    .'|chools/([^/]++)(*:179)'
                    .'|tudents/([^/]++)(?'
                        .'|(*:206)'
                    .')'
                .')'
            .')/?$}sDu',
    ],
    [ // $dynamicRoutes
        35 => [[['_route' => '_preview_error', '_controller' => 'error_controller::preview', '_format' => 'html'], ['code', '_format'], null, null, false, true, null]],
        60 => [
            [['_route' => 'user_get', '_controller' => 'App\\Controller\\AuthController::getUserById'], ['id'], ['GET' => 0], null, false, true, null],
            [['_route' => 'user_update', '_controller' => 'App\\Controller\\AuthController::updateUser'], ['id'], ['PUT' => 0], null, false, true, null],
            [['_route' => 'user_patch', '_controller' => 'App\\Controller\\AuthController::patchUser'], ['id'], ['PATCH' => 0], null, false, true, null],
            [['_route' => 'user_delete', '_controller' => 'App\\Controller\\AuthController::deleteUser'], ['id'], ['DELETE' => 0], null, false, true, null],
        ],
        86 => [[['_route' => 'user_pending_school', '_controller' => 'App\\Controller\\AuthController::handlePendingSchool'], ['id'], ['POST' => 0], null, false, false, null]],
        100 => [[['_route' => 'user_pending_company', '_controller' => 'App\\Controller\\AuthController::handlePendingCompany'], ['id'], ['POST' => 0], null, false, false, null]],
        129 => [[['_route' => 'companies_update', '_controller' => 'App\\Controller\\CompanyController::update'], ['id'], ['PUT' => 0], null, false, true, null]],
        151 => [[['_route' => 'jobs_update', '_controller' => 'App\\Controller\\JobController::update'], ['id'], ['PUT' => 0], null, false, true, null]],
        179 => [[['_route' => 'schools_update', '_controller' => 'App\\Controller\\SchoolController::update'], ['id'], ['PUT' => 0], null, false, true, null]],
        206 => [
            [['_route' => 'students_update', '_controller' => 'App\\Controller\\StudentController::update'], ['id'], ['PUT' => 0], null, false, true, null],
            [['_route' => 'students_delete', '_controller' => 'App\\Controller\\StudentController::delete'], ['id'], ['DELETE' => 0], null, false, true, null],
            [null, null, null, null, false, false, 0],
        ],
    ],
    null, // $checkCondition
];
