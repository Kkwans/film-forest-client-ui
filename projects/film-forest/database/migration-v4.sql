-- ============================================================
-- Migration V4: 标签系统（tag + content_tag）
-- ============================================================

-- 标签表
CREATE TABLE IF NOT EXISTS tag (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50) NOT NULL COMMENT '标签名称',
    color       VARCHAR(20) DEFAULT NULL COMMENT '标签颜色（hex，如 #3B82F6）',
    sort_order  INT NOT NULL DEFAULT 0 COMMENT '排序权重',
    usage_count INT NOT NULL DEFAULT 0 COMMENT '使用次数（冗余计数，加速查询）',
    is_deleted  TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_name (name),
    INDEX idx_usage (usage_count DESC),
    INDEX idx_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标签表';

-- 内容-标签关联表
CREATE TABLE IF NOT EXISTS content_tag (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    content_id   BIGINT UNSIGNED NOT NULL COMMENT '内容ID',
    content_type VARCHAR(20) NOT NULL COMMENT '内容类型：movie/drama/variety/anime/short_drama',
    tag_id       BIGINT UNSIGNED NOT NULL COMMENT '标签ID',
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_content_tag (content_id, content_type, tag_id),
    INDEX idx_tag_id (tag_id),
    INDEX idx_content (content_id, content_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内容-标签关联表';
