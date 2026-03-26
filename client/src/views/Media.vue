<template>
  <div class="media-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>音视频管理</span>
          <el-button type="primary" @click="handleAdd">添加媒体</el-button>
        </div>
      </template>

      <el-form :inline="true" :model="searchForm">
        <el-form-item label="类型">
          <el-select v-model="searchForm.type" clearable placeholder="全部">
            <el-option label="视频" value="video" />
            <el-option label="音频" value="audio" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchData">搜索</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="tableData" border stripe>
        <el-table-column prop="title" label="标题" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.type === 'video' ? 'primary' : 'success'">
              {{ row.type === 'video' ? '视频' : '音频' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="url" label="地址" />
        <el-table-column prop="duration" label="时长" width="100">
          <template #default="{ row }">
            {{ row.duration ? formatDuration(row.duration) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handlePlay(row)">播放</el-button>
            <el-button type="danger" size="small" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        style="margin-top: 20px; text-align: right"
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑媒体' : '添加媒体'" width="500px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="form.type">
            <el-option label="视频" value="video" />
            <el-option label="音频" value="audio" />
          </el-select>
        </el-form-item>
        <el-form-item label="地址" prop="url">
          <el-input v-model="form.url" placeholder="输入媒体 URL 或上传文件" />
        </el-form-item>
        <el-form-item label="时长" prop="duration">
          <el-input-number v-model="form.duration" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="playerVisible" title="媒体播放" width="700px">
      <div class="player-container">
        <video v-if="currentMedia?.type === 'video'" controls style="width: 100%">
          <source :src="currentMedia.url" />
        </video>
        <audio v-else controls style="width: 100%">
          <source :src="currentMedia?.url" />
        </audio>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, FormInstance } from 'element-plus'
import { api } from '@/stores/user'

const tableData = ref<any[]>([])
const searchForm = reactive({ type: '' })
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })
const dialogVisible = ref(false)
const playerVisible = ref(false)
const isEdit = ref(false)
const currentMedia = ref<any>(null)
const formRef = ref<FormInstance>()

const form = reactive({
  id: '',
  title: '',
  type: 'video',
  url: '',
  duration: 0
})

const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  url: [{ required: true, message: '请输入地址', trigger: 'blur' }]
}

const fetchData = async () => {
  const res = await api.get('/media', {
    params: { page: pagination.page, pageSize: pagination.pageSize, type: searchForm.type }
  })
  if (res.code === 200) {
    tableData.value = res.data.list
    pagination.total = res.data.total
  }
}

const handleAdd = () => {
  Object.assign(form, { id: '', title: '', type: 'video', url: '', duration: 0 })
  isEdit.value = false
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  Object.assign(form, row)
  isEdit.value = true
  dialogVisible.value = true
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  const url = isEdit.value ? `/media/${form.id}` : '/media'
  const method = isEdit.value ? 'put' : 'post'
  const res = await api[method](url, form)
  if (res.code === 200) {
    ElMessage.success(isEdit.value ? '更新成功' : '添加成功')
    dialogVisible.value = false
    fetchData()
  }
}

const handlePlay = (row: any) => {
  currentMedia.value = row
  playerVisible.value = true
}

const handleDelete = (id: string) => {
  ElMessageBox.confirm('确定要删除该媒体吗？', '提示', { type: 'warning' }).then(async () => {
    const res = await api.delete(`/media/${id}`)
    if (res.code === 200) {
      ElMessage.success('删除成功')
      fetchData()
    }
  })
}

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

onMounted(() => fetchData())
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.player-container {
  text-align: center;
}
</style>