-- ============================================================
-- Migration V3: 搜索日志表 + 热门搜索词统计
-- ============================================================

-- 搜索日志表：记录每次搜索的关键词和来源
CREATE TABLE IF NOT EXISTS search_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    keyword VARCHAR(200) NOT NULL COMMENT '搜索关键词',
    result_count INT DEFAULT 0 COMMENT '搜索结果数量',
    source VARCHAR(20) DEFAULT 'web' COMMENT '搜索来源：web/app/api',
    user_id BIGINT DEFAULT NULL COMMENT '用户ID（可为空）',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '搜索时间',
    INDEX idx_keyword (keyword),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='搜索日志表';
