<?php
/**
 * Dashboard Footer Include — Bimano CRM
 *
 * Closes main-content, loads JS, closes body/html.
 */

$basePath = defined('CRM_BASE_PATH') ? CRM_BASE_PATH : '';
?>
    </main><!-- /.main-content -->
    <script src="<?= $basePath ?>/assets/js/crud.js"></script>
    <script src="<?= $basePath ?>/assets/js/dashboard.js"></script>
</body>
</html>
