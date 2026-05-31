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
    ],
    [ // $regexpList
        0 => '{^(?'
                .'|/_error/(\\d+)(?:\\.([^/]++))?(*:35)'
                .'|/users/([^/]++)(?'
                    .'|(*:60)'
                    .'|/p(?'
                        .'|ending\\-(?'
                            .'|school(*:89)'
                            .'|company(*:103)'
                        .')'
                        .'|rofile\\-form(*:124)'
                    .')'
                .')'
                .'|/(.*)(*:139)'
                .'|/companies(?'
                    .'|(*:160)'
                    .'|/([^/]++)(*:177)'
                .')'
                .'|/(*:187)'
                .'|/jobs(?'
                    .'|(*:203)'
                    .'|/([^/]++)(*:220)'
                .')'
                .'|/s(?'
                    .'|chools(?'
                        .'|(*:243)'
                        .'|/([^/]++)(*:260)'
                    .')'
                    .'|tudents(?'
                        .'|(*:279)'
                        .'|/([^/]++)(?'
                            .'|(*:299)'
                        .')'
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
        89 => [[['_route' => 'user_pending_school', '_controller' => 'App\\Controller\\AuthController::handlePendingSchool'], ['id'], ['POST' => 0], null, false, false, null]],
        103 => [[['_route' => 'user_pending_company', '_controller' => 'App\\Controller\\AuthController::handlePendingCompany'], ['id'], ['POST' => 0], null, false, false, null]],
        124 => [[['_route' => 'user_profile_form', '_controller' => 'App\\Controller\\AuthController::profileForm'], ['id'], ['POST' => 0], null, false, false, null]],
        139 => [[['_route' => 'cors_options', '_controller' => 'App\\Controller\\AuthController::options'], ['any'], ['OPTIONS' => 0], null, false, true, null]],
        160 => [[['_route' => 'companies_index', '_controller' => 'App\\Controller\\CompanyController::index'], [], ['GET' => 0], null, false, false, null]],
        177 => [[['_route' => 'companies_update', '_controller' => 'App\\Controller\\CompanyController::update'], ['id'], ['PUT' => 0], null, false, true, null]],
        187 => [[['_route' => 'home', '_controller' => 'App\\Controller\\DefaultController::index'], [], ['GET' => 0], null, false, false, null]],
        203 => [[['_route' => 'jobs_index', '_controller' => 'App\\Controller\\JobController::index'], [], ['GET' => 0], null, false, false, null]],
        220 => [[['_route' => 'jobs_update', '_controller' => 'App\\Controller\\JobController::update'], ['id'], ['PUT' => 0], null, false, true, null]],
        243 => [[['_route' => 'schools_index', '_controller' => 'App\\Controller\\SchoolController::index'], [], ['GET' => 0], null, false, false, null]],
        260 => [[['_route' => 'schools_update', '_controller' => 'App\\Controller\\SchoolController::update'], ['id'], ['PUT' => 0], null, false, true, null]],
        279 => [
            [['_route' => 'students_index', '_controller' => 'App\\Controller\\StudentController::index'], [], ['GET' => 0], null, false, false, null],
            [['_route' => 'students_create', '_controller' => 'App\\Controller\\StudentController::create'], [], ['POST' => 0], null, false, false, null],
        ],
        299 => [
            [['_route' => 'students_update', '_controller' => 'App\\Controller\\StudentController::update'], ['id'], ['PUT' => 0], null, false, true, null],
            [['_route' => 'students_delete', '_controller' => 'App\\Controller\\StudentController::delete'], ['id'], ['DELETE' => 0], null, false, true, null],
            [null, null, null, null, false, false, 0],
        ],
    ],
    null, // $checkCondition
];
