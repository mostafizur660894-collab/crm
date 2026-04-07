<?php
/**
 * Dashboard Footer Include — Bimano CRM
 *
 * Loads shared JS and closes body/html.
 */

$basePath = defined('BASE_URL') ? rtrim(BASE_URL, '/') : (defined('CRM_BASE_PATH') ? CRM_BASE_PATH : '');
?>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
    <script src="<?= $basePath ?>/assets/js/crud.js"></script>
    <script src="<?= $basePath ?>/assets/js/dashboard.js"></script>
    <script src="<?= $basePath ?>/assets/js/app.js"></script>
</body>
</html>
