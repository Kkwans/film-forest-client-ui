interface UserAvatarProps {
  name?: string | null;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
  alt?: string;
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'size-5 text-[10px]',
  md: 'size-7 text-xs',
  lg: 'size-12 text-lg',
} as const;

/** Header、个人中心与移动导航共用的用户头像展示契约。 */
export default function UserAvatar({ name, src, size = 'md', alt, className = '' }: UserAvatarProps) {
  const label = name?.trim() || '用户';

  return (
    <span className={`${SIZE_CLASSES[size]} inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-accent font-bold text-white ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- 用户头像来源域名不固定。
        <img src={src} alt={alt || `${label}头像`} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden>{label.charAt(0)}</span>
      )}
    </span>
  );
}
