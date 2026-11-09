import Header from '#/components/features/header'
import FlagEditor from '#/features/feature-flag/components/flag-editor'

function YourCode() {
  return (
    <section>
      <Header
        title="Feature Flag Editor"
        subTitle="สร้างและแก้ไข Feature Flag แบบ GO Feature Flag พร้อมดู JSON ที่ได้แบบ Real-time"
      />
      <FlagEditor />
    </section>
  )
}

export default YourCode
