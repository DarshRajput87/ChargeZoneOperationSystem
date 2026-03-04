import './EVLoader.css';

const EVLoader = ({ text = 'Loading...' }) => {
  return (
    <div className="ev-loader-wrap">
      <div className="ev-loader-inner">
        <div className="ev-arc-wrap">
          <div className="ev-arc" />
          <svg className="ev-icon" viewBox="0 0 26 26" fill="none">
            <circle cx="13" cy="13" r="12" stroke="#e8401c" strokeWidth="1.5" opacity="0.35" />
            <path d="M11 7.5 L11 12.5 L8 12.5 L15 19 L15 14 L18 14 Z" fill="#e8401c" />
          </svg>
        </div>
        <span className="ev-loader-text">{text}</span>
      </div>
    </div>
  );
};

export default EVLoader;