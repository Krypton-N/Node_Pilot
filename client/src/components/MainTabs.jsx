import EditorPane from './EditorPane';

export default function MainTabs({ project, file, value, dirty, onChange, onSave }) {
  return (
    <div className="d-flex flex-column h-100">
      <div className="flex-grow-1 overflow-hidden position-relative">
        <div className="h-100">
          <EditorPane file={file} value={value} dirty={dirty} onChange={onChange} onSave={onSave} />
        </div>
      </div>
    </div>
  );
}
